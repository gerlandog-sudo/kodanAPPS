<?php
header('Content-Type: text/plain; charset=utf-8');
echo "PHP Version: " . phpversion() . "\n\n";

$sharedPath = '/home/admkoda/kodanAPPS/shared';
echo "Diagnostics for $sharedPath:\n";
echo "-------------------------------\n";
if (is_dir($sharedPath)) {
    echo "Directory exists: Yes\n";
    $files = scandir($sharedPath);
    echo "Files inside:\n";
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo " - $file (Size: " . filesize("$sharedPath/$file") . " bytes)\n";
        }
    }
} else {
    echo "Directory exists: No\n";
}

$envPath = $sharedPath . '/.env';
echo "\nFile check for $envPath:\n";
echo "-------------------------------\n";
if (file_exists($envPath)) {
    echo "Exists: Yes\n";
    echo "Readable: " . (is_readable($envPath) ? "Yes" : "No") . "\n";
} else {
    echo "Exists: No\n";
}
