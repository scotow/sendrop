<?php

function human_filesize($bytes, $decimals = 2) {
    $sz = 'BKMGTP';
    $factor = intval(floor((strlen($bytes) - 1) / 3));
    return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . $sz[$factor];
}