<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Lets the admin run the race on a per-month basis instead of per-quarter.
// `month` is only meaningful when period_type is 'month'; `quarter` is only
// meaningful when period_type is 'quarter'. Same draft/live split as the
// existing quarter/year columns.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_settings', function (Blueprint $table) {
            $table->string('period_type', 10)->default('quarter')->after('year');
            $table->unsignedTinyInteger('month')->nullable()->after('period_type');
            $table->string('draft_period_type', 10)->nullable()->after('draft_year');
            $table->unsignedTinyInteger('draft_month')->nullable()->after('draft_period_type');
        });
    }

    public function down(): void
    {
        Schema::table('race_settings', function (Blueprint $table) {
            $table->dropColumn(['period_type', 'month', 'draft_period_type', 'draft_month']);
        });
    }
};
