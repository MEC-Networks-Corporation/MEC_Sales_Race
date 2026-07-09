<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

// Admin-only user management — every route here requires auth:sanctum (see routes/api.php).
class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'users' => User::orderBy('name')->get(['id', 'name', 'email', 'created_at']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'email_verified_at' => now(),
        ]);

        return response()->json(['user' => $user->only('id', 'name', 'email', 'created_at')], 201);
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages(['user' => ["You can't remove your own account while signed in."]]);
        }

        if (User::count() <= 1) {
            throw ValidationException::withMessages(['user' => ['At least one admin account must remain.']]);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['ok' => true]);
    }
}
