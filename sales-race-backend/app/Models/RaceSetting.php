<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RaceSetting extends Model
{
    protected $fillable = [
        'quarter', 'year', 'period_type', 'month',
        'draft_quarter', 'draft_year', 'draft_period_type', 'draft_month',
        'draft_initialized_at',
    ];

    protected function casts(): array
    {
        return [
            'quarter' => 'integer',
            'year' => 'integer',
            'month' => 'integer',
            'draft_quarter' => 'integer',
            'draft_year' => 'integer',
            'draft_month' => 'integer',
            'draft_initialized_at' => 'datetime',
        ];
    }

    /**
     * There's only ever one settings row. Creates it with the current
     * calendar quarter/year the first time it's asked for.
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], [
            'quarter' => intdiv(now()->month - 1, 3) + 1,
            'year' => now()->year,
            'period_type' => 'quarter',
            'month' => now()->month,
        ]);
    }
}
