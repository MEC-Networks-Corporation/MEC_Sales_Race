<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('race_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('quarter')->default(1);
            $table->unsignedSmallInteger('year')->default(2026);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('race_settings');
    }
};
