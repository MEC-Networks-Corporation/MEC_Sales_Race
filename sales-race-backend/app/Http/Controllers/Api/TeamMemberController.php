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
    // Only ever shows the published ("live") roster, never the admin's draft.
    public function index()
    {
        $team = TeamMember::live()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->toRace());

        $setting = RaceSetting::current();

        return response()->json([
            'team' => $team,
            'period' => ['quarter' => $setting->quarter, 'year' => $setting->year],
        ]);
    }

    // Admin only (see routes/api.php) below this line. Everything here reads
    // and writes the "draft" roster — none of it reaches the TV until publish().

    // Admin's editor view. The draft roster is seeded from live the first
    // time an admin ever opens the editor (or right after a publish). Once
    // the draft has been initialized, it's never auto-reseeded again — even
    // if the admin empties it via "clear all" — so an intentional empty
    // roster survives a page reload.
    public function draftIndex()
    {
        $setting = RaceSetting::current();

        if ($setting->draft_initialized_at === null) {
            $this->seedDraftFromLive();
            $setting->update([
                'draft_quarter' => $setting->quarter,
                'draft_year' => $setting->year,
                'draft_initialized_at' => now(),
            ]);
        }

        $team = TeamMember::draft()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->toRace());

        return response()->json([
            'team' => $team,
            'period' => ['quarter' => $setting->draft_quarter, 'year' => $setting->draft_year],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'team' => ['nullable', 'string', 'max:120'],
            'pct' => ['nullable', 'integer', 'min:0', 'max:999'],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{3,6}$/'],
        ]);

        TeamSnapshot::capture();

        $maxSort = TeamMember::draft()->max('sort_order') ?? 0;

        $member = TeamMember::create([
            'name' => $data['name'],
            'team' => $data['team'] ?? '',
            'pct' => $data['pct'] ?? 0,
            'color' => $data['color'] ?? '#2d8cff',
            'sort_order' => $maxSort + 1,
            'status' => 'draft',
        ]);

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

        return response()->json(['ok' => true]);
    }

    public function clearAll()
    {
        TeamSnapshot::capture();

        TeamMember::draft()->delete();

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
            TeamMember::draft()->delete();
        }

        $maxSort = TeamMember::draft()->max('sort_order') ?? 0;
        $palette = ['#ff5a3c', '#2d8cff', '#9b5cff', '#27d07a', '#ffb000', '#ff3b9d', '#00c6c0', '#ff7a00'];

        foreach ($data['rows'] as $i => $row) {
            $maxSort++;
            TeamMember::create([
                'name' => $row['name'],
                'team' => $row['team'] ?? '',
                'pct' => $row['pct'] ?? 0,
                'color' => $row['color'] ?? $palette[$i % count($palette)],
                'sort_order' => $maxSort,
                'status' => 'draft',
            ]);
        }

        return response()->json(['ok' => true, 'imported' => count($data['rows'])]);
    }

    public function uploadPhoto(Request $request, TeamMember $teamMember)
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:15360'], // 15MB
        ]);

        TeamSnapshot::capture();

        // Old photo file is intentionally left on disk — see note in destroy().
        $path = $request->file('photo')->store('team-photos', 'public');
        $teamMember->update(['photo_path' => $path]);

        return response()->json(['member' => $teamMember->fresh()->toRace()]);
    }

    // Reverts the draft roster to how it looked right before the last mutating
    // action (add/edit/delete/import/clear/photo). Single level of undo.
    public function undo()
    {
        $payload = TeamSnapshot::row()->payload;

        if ($payload === null) {
            return response()->json(['ok' => false, 'message' => 'Nothing to undo.'], 409);
        }

        DB::transaction(function () use ($payload) {
            TeamMember::draft()->delete();

            if (! empty($payload)) {
                DB::table('team_members')->insert($payload);
            }

            TeamSnapshot::clear();
        });

        $team = TeamMember::draft()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->toRace());

        return response()->json(['ok' => true, 'team' => $team]);
    }

    // Publishes the draft roster + period to the TV. Draft rows that were
    // seeded from a live row (live_id set) update that row in place, so
    // published ids — and RaceTrack's per-racer animation state — stay
    // stable across publishes. Brand-new draft rows become new live rows;
    // live rows with no corresponding draft row are removed.
    public function publish()
    {
        DB::transaction(function () {
            $draftRows = TeamMember::draft()->orderBy('sort_order')->orderBy('id')->get();
            $keepLiveIds = [];

            foreach ($draftRows as $draft) {
                $matchesExistingLive = $draft->live_id
                    && TeamMember::live()->where('id', $draft->live_id)->exists();

                if ($matchesExistingLive) {
                    TeamMember::live()->where('id', $draft->live_id)->update([
                        'name' => $draft->name,
                        'team' => $draft->team,
                        'pct' => $draft->pct,
                        'color' => $draft->color,
                        'photo_path' => $draft->photo_path,
                        'sort_order' => $draft->sort_order,
                    ]);
                    $keepLiveIds[] = $draft->live_id;
                } else {
                    $newLive = TeamMember::create([
                        'name' => $draft->name,
                        'team' => $draft->team,
                        'pct' => $draft->pct,
                        'color' => $draft->color,
                        'photo_path' => $draft->photo_path,
                        'sort_order' => $draft->sort_order,
                        'status' => 'live',
                    ]);
                    $keepLiveIds[] = $newLive->id;
                }
            }

            TeamMember::live()->whereNotIn('id', $keepLiveIds)->delete();

            TeamMember::draft()->delete();
            $this->seedDraftFromLive();

            $setting = RaceSetting::current();
            if ($setting->draft_quarter !== null) {
                $setting->update([
                    'quarter' => $setting->draft_quarter,
                    'year' => $setting->draft_year,
                ]);
            }

            TeamSnapshot::clear();
        });

        // The publish itself already succeeded in the DB — don't fail the
        // whole request just because the Reverb websocket server isn't
        // reachable. The TV will still pick up the new roster on its next
        // page load; it just won't update live without Reverb running.
        try {
            broadcast(new TeamUpdated());
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['ok' => true]);
    }

    // Clones the current live roster into fresh draft rows so the admin
    // always has a draft to edit, seeded from whatever's on the TV. Each
    // draft row remembers which live row it came from (live_id) so a later
    // publish() can update that same live row instead of replacing it.
    private function seedDraftFromLive(): void
    {
        $liveRows = TeamMember::live()->orderBy('sort_order')->orderBy('id')->get();

        foreach ($liveRows as $row) {
            TeamMember::create([
                'name' => $row->name,
                'team' => $row->team,
                'pct' => $row->pct,
                'color' => $row->color,
                'photo_path' => $row->photo_path,
                'sort_order' => $row->sort_order,
                'live_id' => $row->id,
                'status' => 'draft',
            ]);
        }
    }
}
