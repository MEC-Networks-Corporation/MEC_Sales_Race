<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RaceSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    // Admin only (see routes/api.php). Stages the period as a draft — it
    // only reaches the TV once the admin publishes.
    public function update(Request $request)
    {
        $data = $request->validate([
            'period_type' => ['required', 'in:quarter,month'],
            'quarter' => ['required_if:period_type,quarter', 'integer', 'min:1', 'max:4'],
            'month' => ['required_if:period_type,month', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
        ]);

        $setting = RaceSetting::current();
        $setting->update([
            'draft_period_type' => $data['period_type'],
            'draft_quarter' => $data['period_type'] === 'quarter' ? $data['quarter'] : $setting->draft_quarter,
            'draft_month' => $data['period_type'] === 'month' ? $data['month'] : $setting->draft_month,
            'draft_year' => $data['year'],
        ]);

        return response()->json(['period' => [
            'period_type' => $setting->draft_period_type,
            'quarter' => $setting->draft_quarter,
            'month' => $setting->draft_month,
            'year' => $setting->draft_year,
        ]]);
    }
}
