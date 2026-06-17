<?php
header('Content-Type: text/plain; charset=utf-8');
echo "PHP Version: " . phpversion() . "\n\n";

$errorLogPath = __DIR__ . '/error_log';
if (file_exists($errorLogPath)) {
    echo "--- Last 20 lines of error_log ---\n";
    $lines = file($errorLogPath);
    $lastLines = array_slice($lines, -20);
    echo implode("", $lastLines);
} else {
    echo "No error_log file found at: $errorLogPath\n";
    
    // Buscar en el directorio padre por si acaso
    $parentLog = __DIR__ . '/../error_log';
    if (file_exists($parentLog)) {
        echo "--- Last 20 lines of parent error_log ---\n";
        $lines = file($parentLog);
        $lastLines = array_slice($lines, -20);
        echo implode("", $lastLines);
    } else {
        echo "No parent error_log found either.\n";
    }
}
