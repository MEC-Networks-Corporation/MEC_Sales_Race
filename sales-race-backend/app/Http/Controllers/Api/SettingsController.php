<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamUpdated;
use App\Http\Controllers\Controller;
use App\Models\RaceSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // Admin only (see routes/api.php).
    public function update(Request $request)
    {
        $data = $request->validate([
            'quarter' => ['required', 'integer', 'min:1', 'max:4'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
        ]);

        $setting = RaceSetting::current();
        $setting->update($data);

        // Broadcast so the public display picks up the new quarter/year live.
        broadcast(new TeamUpdated());

        return response()->json(['period' => ['quarter' => $setting->quarter, 'year' => $setting->year]]);
    }
}
