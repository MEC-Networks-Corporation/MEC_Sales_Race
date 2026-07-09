<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Single-row undo buffer: overwritten with the roster's state right
        // before every mutating action, cleared once undone.
        Schema::create('team_snapshots', function (Blueprint $table) {
            $table->id();
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_snapshots');
    }
};
