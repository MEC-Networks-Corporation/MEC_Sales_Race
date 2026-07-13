<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Holds the admin's pending quarter/year until it's published to the live columns.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('draft_quarter')->nullable()->after('quarter');
            $table->unsignedSmallInteger('draft_year')->nullable()->after('year');
        });
    }

    public function down(): void
    {
        Schema::table('race_settings', function (Blueprint $table) {
            $table->dropColumn(['draft_quarter', 'draft_year']);
        });
    }
};
