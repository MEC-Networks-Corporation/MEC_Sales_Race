<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TeamMemberController;
use Illuminate\Support\Facades\Route;

// --- Public: the display board and the admin login screen both need this ---
Route::get('/team', [TeamMemberController::class, 'index']);
Route::post('/login', [AuthController::class, 'login']);

// --- Admin only (Sanctum bearer token, see AuthController::login) ---
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/team-members', [TeamMemberController::class, 'store']);
    Route::put('/team-members/{teamMember}', [TeamMemberController::class, 'update']);
    Route::delete('/team-members/{teamMember}', [TeamMemberController::class, 'destroy']);
    Route::post('/team-members/{teamMember}/photo', [TeamMemberController::class, 'uploadPhoto']);
    Route::post('/team-members/import', [TeamMemberController::class, 'import']);
    Route::delete('/team-members', [TeamMemberController::class, 'clearAll']);
});
