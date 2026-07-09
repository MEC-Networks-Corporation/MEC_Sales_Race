<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class TeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'team',
        'pct',
        'color',
        'photo_path',
        'sort_order',
    ];

    protected $appends = ['photo_url'];

    protected function casts(): array
    {
        return [
            'pct' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null;
    }

    /**
     * Shape returned to the frontend — matches the original app's field names
     * (name/team/pct/color/photo) so the React components can stay close to
     * the original vanilla-JS version.
     */
    public function toRace(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'team' => $this->team,
            'pct' => $this->pct,
            'color' => $this->color,
            'photo' => $this->photo_url,
        ];
    }
}
