<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates (or updates) the admin login from .env values, so credentials
 * never need to be hardcoded or committed. Safe to re-run — it upserts by
 * email rather than creating duplicates.
 *
 * .env:
 *   ADMIN_NAME="Marc"
 *   ADMIN_EMAIL=admin@mecnetworks.com
 *   ADMIN_PASSWORD=change-me-before-first-run
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command->warn('Skipped admin seeding — set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');

            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Admin'),
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        $this->command->info("Admin account ready: {$email}");
    }
}
