<?php

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TeamMemberController;
use Illuminate\Support\Facades\Route;

// --- Public: the display board and the admin login screen both need this ---
Route::get('/team', [TeamMemberController::class, 'index']);
Route::post('/login', [AuthController::class, 'login']);

// --- Admin only (Sanctum bearer token, see AuthController::login) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/team-members/draft', [TeamMemberController::class, 'draftIndex']);
    Route::post('/team-members', [TeamMemberController::class, 'store']);
    Route::put('/team-members/{teamMember}', [TeamMemberController::class, 'update']);
    Route::delete('/team-members/{teamMember}', [TeamMemberController::class, 'destroy']);
    Route::post('/team-members/undo', [TeamMemberController::class, 'undo']);
    Route::post('/team-members/{teamMember}/photo', [TeamMemberController::class, 'uploadPhoto']);
    Route::post('/team-members/import', [TeamMemberController::class, 'import']);
    Route::delete('/team-members', [TeamMemberController::class, 'clearAll']);
    Route::post('/publish', [TeamMemberController::class, 'publish']);

    Route::put('/settings', [SettingsController::class, 'update']);

    Route::get('/admin-users', [AdminUserController::class, 'index']);
    Route::post('/admin-users', [AdminUserController::class, 'store']);
    Route::delete('/admin-users/{user}', [AdminUserController::class, 'destroy']);
});
