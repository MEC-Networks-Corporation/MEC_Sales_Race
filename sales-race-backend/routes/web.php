<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['status' => 'ok', 'app' => 'MEC Sales Race API']);
});
