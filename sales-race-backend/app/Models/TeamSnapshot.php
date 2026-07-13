<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeamSnapshot extends Model
{
    protected $fillable = ['payload'];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }

    /** There's only ever one row — it's a single-slot undo buffer. */
    public static function row(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }

    /** Overwrites the buffer with the current draft roster, right before a mutation. */
    public static function capture(): void
    {
        $rows = TeamMember::draft()->orderBy('sort_order')->orderBy('id')->get()
            ->map(fn (TeamMember $m) => $m->only([
                'id', 'name', 'team', 'pct', 'color', 'photo_path', 'sort_order', 'status',
                'live_id', 'created_at', 'updated_at',
            ]))
            ->all();

        static::row()->update(['payload' => $rows]);
    }

    /** Clears the buffer so the same change can't be undone twice. */
    public static function clear(): void
    {
        static::row()->update(['payload' => null]);
    }
}
