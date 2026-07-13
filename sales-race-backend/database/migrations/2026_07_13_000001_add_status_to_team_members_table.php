<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Admin edits are now staged as 'draft' rows and only become visible on the
// public display once the admin publishes, which flips them to 'live'.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->string('status', 10)->default('live')->after('sort_order');
            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropIndex(['status', 'sort_order']);
            $table->dropColumn('status');
        });
    }
};
