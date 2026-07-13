<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RaceSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // Admin only (see routes/api.php). Stages the quarter/year as a draft —
    // it only reaches the TV once the admin publishes.
    public function update(Request $request)
    {
        $data = $request->validate([
            'quarter' => ['required', 'integer', 'min:1', 'max:4'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
        ]);

        $setting = RaceSetting::current();
        $setting->update(['draft_quarter' => $data['quarter'], 'draft_year' => $data['year']]);

        return response()->json(['period' => ['quarter' => $setting->draft_quarter, 'year' => $setting->draft_year]]);
    }
}
