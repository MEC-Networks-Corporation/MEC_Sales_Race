<?php

namespace App\Events;

use App\Models\TeamMember;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

/**
 * Fired after every create/update/delete/import so both the public display
 * and every open admin tab receive the new roster immediately over the
 * public "race" channel. ShouldBroadcastNow means this sends synchronously —
 * no queue worker needs to be running for real-time updates to work.
 */
class TeamUpdated implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public array $team;

    public function __construct()
    {
        $this->team = TeamMember::orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $member) => $member->toRace())
            ->values()
            ->all();
    }

    public function broadcastOn(): array
    {
        return [new Channel('race')];
    }

    public function broadcastAs(): string
    {
        return 'team.updated';
    }

    public function broadcastWith(): array
    {
        return ['team' => $this->team];
    }
}
