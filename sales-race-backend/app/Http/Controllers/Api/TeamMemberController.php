<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Models\RaceSetting;
use App\Models\TeamMember;
use App\Models\TeamSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeamMemberController extends Controller
{
    // Public — the display page and admin login screen both need this without auth.
    public function index()
    {
        $team = TeamMember::orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->toRace());

        $setting = RaceSetting::current();

        return response()->json([
            'team' => $team,
            'period' => ['quarter' => $setting->quarter, 'year' => $setting->year],
        ]);
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

        TeamSnapshot::capture();

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

        TeamSnapshot::capture();

        $teamMember->update($data);

        broadcast(new TeamUpdated());

        return response()->json(['member' => $teamMember->toRace()]);
    }

    public function destroy(TeamMember $teamMember)
    {
        TeamSnapshot::capture();

        // Note: the photo file is deliberately left on disk (not deleted) so
        // that "undo last change" can bring the row back with a working
        // photo. This can leave orphaned files behind over time, which is an
        // acceptable trade-off for a small internal tool.
        $teamMember->delete();

        broadcast(new TeamUpdated());

        return response()->json(['ok' => true]);
    }

    public function clearAll()
    {
        TeamSnapshot::capture();

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

        TeamSnapshot::capture();

        if ($data['mode'] === 'replace') {
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

        TeamSnapshot::capture();

        // Old photo file is intentionally left on disk — see note in destroy().
        $path = $request->file('photo')->store('team-photos', 'public');
        $teamMember->update(['photo_path' => $path]);

        broadcast(new TeamUpdated());

        return response()->json(['member' => $teamMember->fresh()->toRace()]);
    }

    // Reverts the roster to how it looked right before the last mutating
    // action (add/edit/delete/import/clear/photo). Single level of undo.
    public function undo()
    {
        $payload = TeamSnapshot::row()->payload;

        if ($payload === null) {
            return response()->json(['ok' => false, 'message' => 'Nothing to undo.'], 409);
        }

        DB::transaction(function () use ($payload) {
            TeamMember::query()->delete();

            if (! empty($payload)) {
                DB::table('team_members')->insert($payload);
            }

            TeamSnapshot::clear();
        });

        broadcast(new TeamUpdated());

        $team = TeamMember::orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->toRace());

        return response()->json(['ok' => true, 'team' => $team]);
    }
}
