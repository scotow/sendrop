<?php

//ini_set('display_errors', 1);
//ini_set('display_startup_errors', 1);
//error_reporting(E_ALL);

include_once "../lib/upload.php";
include_once "../lib/download.php";

$uri = $_SERVER["REQUEST_URI"];

if($uri === "/") {
    if(!empty($_FILES["files"])) {
        upload_files($_FILES["files"]);
    } else if(!empty($_FILES["file"])) {
        upload_files($_FILES["file"]);
    } else {
        if(!empty($_POST["drop"])) {
            if(!empty($_POST["pretty"])) {
                $data = json_decode($_POST["drop"], true);
                include "../templates/link.php";
            } else {
                header('Content-type: text/plain');
                exit($_POST["drop"]);
            }
        } else {
            include "../templates/upload.html";
        }
    }
} else {
    $uri = trim($uri, "/");
    if(preg_match("/^(([a-zA-Z0-9]{6})|([a-z]+(-[a-z]+){2}))(\+(([a-zA-Z0-9]{6})|([a-z]+(-[a-z]+){2})))+$/", $uri) || !empty($_POST["zip"])) {
        download_zip($uri);
    } else if(preg_match("/^[a-zA-Z0-9]{6}$/", $uri)) {
        download_short_alias($uri);
    } else if(preg_match("/^[a-z]+(-[a-z]+){2}$/", $uri)) {
        download_long_alias($uri);
    }
}

exit;