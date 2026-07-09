<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Superseded by the snapshot-based "undo last change" feature, which restores
// the whole roster rather than one soft-deleted row at a time.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->softDeletes();
        });
    }
};
