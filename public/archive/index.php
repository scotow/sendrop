<?php

//ini_set('display_errors', 1);
//ini_set('display_startup_errors', 1);
//error_reporting(E_ALL);

include_once "../../lib/archive.php";
include_once "../../lib/download.php";

$uri = $_SERVER["REQUEST_URI"];
$alias = explode("/", $uri)[2];

$zip = false;
if(preg_match("/^[a-zA-Z0-9]{6}$/", $alias)) {
    $zip = get_archive_short_alias($alias);
} else if(preg_match("/^[a-z]+(-[a-z]+){2}$/", $alias)) {
    $zip = get_archive_long_alias($alias);
}

if($zip){
    download_file($zip);
    delete_zip($zip);
} else {
    exit_with_error(custom_error("Couldn't build that archive for you"));
}

exit;