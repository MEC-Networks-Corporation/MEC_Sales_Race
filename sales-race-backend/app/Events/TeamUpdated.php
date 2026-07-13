<?php

namespace App\Events;

use App\Models\RaceSetting;
use App\Models\TeamMember;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

/**
 * Fired when the admin publishes their draft, so the public display picks up
 * the newly-live roster and period immediately over the public "race"
 * channel. ShouldBroadcastNow means this sends synchronously — no queue
 * worker needs to be running for the TV to update live.
 */
class TeamUpdated implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public array $team;

    public array $period;

    public function __construct()
    {
        $this->team = TeamMember::live()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $member) => $member->toRace())
            ->values()
            ->all();

        $setting = RaceSetting::current();
        $this->period = ['quarter' => $setting->quarter, 'year' => $setting->year];
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
        return ['team' => $this->team, 'period' => $this->period];
    }
}
