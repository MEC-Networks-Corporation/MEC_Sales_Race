<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeamMemberController extends Controller
{
    // Public — the display page and admin login screen both need this without auth.
    public function index()
    {
        $team = TeamMember::orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->toRace());

        return response()->json(['team' => $team]);
    }

    // Admin only (see routes/api.php) below this line.

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'team' => ['nullable', 'string', 'max:120'],
            'pct' => ['nullable', 'integer', 'min:0', 'max:999'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{3,6}$/'],
        ]);

        $maxSort = TeamMember::max('sort_order') ?? 0;

        $member = TeamMember::create([
            'name' => $data['name'],
            'team' => $data['team'] ?? '',
            'pct' => $data['pct'] ?? 0,
            'color' => $data['color'] ?? '#2d8cff',
            'sort_order' => $maxSort + 1,
        ]);

        broadcast(new TeamUpdated());

        return response()->json(['member' => $member->toRace()], 201);
    }

    public function update(Request $request, TeamMember $teamMember)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'team' => ['sometimes', 'nullable', 'string', 'max:120'],
            'pct' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{3,6}$/'],
        ]);

        $teamMember->update($data);

        broadcast(new TeamUpdated());

        return response()->json(['member' => $teamMember->toRace()]);
    }

    public function destroy(TeamMember $teamMember)
    {
        if ($teamMember->photo_path) {
            Storage::disk('public')->delete($teamMember->photo_path);
        }
        $teamMember->delete();

        broadcast(new TeamUpdated());

        return response()->json(['ok' => true]);
    }

    public function clearAll()
    {
        foreach (TeamMember::whereNotNull('photo_path')->pluck('photo_path') as $path) {
            Storage::disk('public')->delete($path);
        }
        TeamMember::query()->delete();

        broadcast(new TeamUpdated());

        return response()->json(['ok' => true]);
    }

    // CSV import — mirrors the original app's "merge" (append) vs "replace" (wipe first) behavior.
    // Expects rows already parsed client-side into [{name, team, pct, color}, ...].
    public function import(Request $request)
    {
        $data = $request->validate([
            'mode' => ['required', 'in:merge,replace'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.name' => ['required', 'string', 'max:120'],
            'rows.*.team' => ['nullable', 'string', 'max:120'],
            'rows.*.pct' => ['nullable', 'integer', 'min:0', 'max:999'],
            'rows.*.color' => ['nullable', 'regex:/^#[0-9a-fA-F]{3,6}$/'],
        ]);

        if ($data['mode'] === 'replace') {
            foreach (TeamMember::whereNotNull('photo_path')->pluck('photo_path') as $path) {
                Storage::disk('public')->delete($path);
            }
            TeamMember::query()->delete();
        }

        $maxSort = TeamMember::max('sort_order') ?? 0;
        $palette = ['#ff5a3c', '#2d8cff', '#9b5cff', '#27d07a', '#ffb000', '#ff3b9d', '#00c6c0', '#ff7a00'];

        foreach ($data['rows'] as $i => $row) {
            $maxSort++;
            TeamMember::create([
                'name' => $row['name'],
                'team' => $row['team'] ?? '',
                'pct' => $row['pct'] ?? 0,
                'color' => $row['color'] ?? $palette[$i % count($palette)],
                'sort_order' => $maxSort,
            ]);
        }

        broadcast(new TeamUpdated());

        return response()->json(['ok' => true, 'imported' => count($data['rows'])]);
    }

    public function uploadPhoto(Request $request, TeamMember $teamMember)
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:5120'], // 5MB
        ]);

        if ($teamMember->photo_path) {
            Storage::disk('public')->delete($teamMember->photo_path);
        }

        $path = $request->file('photo')->store('team-photos', 'public');
        $teamMember->update(['photo_path' => $path]);

        broadcast(new TeamUpdated());

        return response()->json(['member' => $teamMember->fresh()->toRace()]);
    }
}
