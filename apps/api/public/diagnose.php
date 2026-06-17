<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain; charset=utf-8');
echo "Diagnosing index.php execution:\n";
echo "---------------------------------\n";

try {
    // Intentar incluir index.php para ver si arroja algún error
    include 'index.php';
    echo "\n---------------------------------\n";
    echo "index.php included successfully without uncaught exceptions.\n";
} catch (\Throwable $e) {
    echo "\n---------------------------------\n";
    echo "FATAL ERROR / EXCEPTION CATALYZED:\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
