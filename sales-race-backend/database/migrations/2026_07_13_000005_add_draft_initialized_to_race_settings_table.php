<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Marks whether the draft roster has ever been seeded, so an intentionally
// emptied draft (via "clear all") doesn't get silently re-seeded from live
// on the next page load.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_settings', function (Blueprint $table) {
            $table->timestamp('draft_initialized_at')->nullable()->after('draft_year');
        });
    }

    public function down(): void
    {
        Schema::table('race_settings', function (Blueprint $table) {
            $table->dropColumn('draft_initialized_at');
        });
    }
};
