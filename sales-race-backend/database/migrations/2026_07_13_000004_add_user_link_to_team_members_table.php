<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            // For draft rows only: which live row this draft was seeded from,
            // so publish() can update that row in place instead of replacing
            // it (keeps ids — and TV animations — stable across publishes).
            $table->unsignedBigInteger('live_id')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropColumn('live_id');
        });
    }
};
