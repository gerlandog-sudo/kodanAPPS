<?php
header('Content-Type: text/plain; charset=utf-8');
echo "PHP Version: " . phpversion() . "\n\n";

$currentPath = '/home/admkoda/kodanAPPS/current';
echo "Diagnostics for $currentPath:\n";
echo "-------------------------------\n";
if (file_exists($currentPath)) {
    echo "Exists: Yes\n";
    echo "Is Link: " . (is_link($currentPath) ? "Yes" : "No") . "\n";
    echo "Is Dir: " . (is_dir($currentPath) ? "Yes" : "No") . "\n";
    if (is_link($currentPath)) {
        echo "Points to: " . readlink($currentPath) . "\n";
    }
} else {
    echo "Exists: No\n";
}

$apiLinkPath = '/home/admkoda/public_html/api';
echo "\nDiagnostics for $apiLinkPath:\n";
echo "-------------------------------\n";
if (file_exists($apiLinkPath)) {
    echo "Exists: Yes\n";
    echo "Is Link: " . (is_link($apiLinkPath) ? "Yes" : "No") . "\n";
    echo "Is Dir: " . (is_dir($apiLinkPath) ? "Yes" : "No") . "\n";
    if (is_link($apiLinkPath)) {
        echo "Points to: " . readlink($apiLinkPath) . "\n";
    }
} else {
    echo "Exists: No\n";
}

echo "\nReleases directory contents:\n";
echo "-------------------------------\n";
$releasesPath = '/home/admkoda/kodanAPPS/releases';
if (is_dir($releasesPath)) {
    $files = scandir($releasesPath);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            echo " - $file\n";
        }
    }
} else {
    echo "Releases folder not found.\n";
}
