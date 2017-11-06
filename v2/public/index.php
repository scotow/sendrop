<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include $_SERVER["DOCUMENT_ROOT"] . "/../config/database.php";

$LIB_PATH = $_SERVER["DOCUMENT_ROOT"] . "/../lib/";
$TEMPLATE_PATH = $_SERVER["DOCUMENT_ROOT"] . "/../templates/";

spl_autoload_register(function($class_name) use ($LIB_PATH) {
    include $LIB_PATH . $class_name . ".php";
});

$uri = $_SERVER["REQUEST_URI"];

if($uri === "/") {
    if(!empty($_FILES["files"])) {
        $file_uploader = new FileUploader($_FILES["files"]);
        $file_uploader->upload_files();
        //upload_files($_FILES["files"]);
    } else if(!empty($_FILES["file"])) {
        $file_uploader = new FileUploader($_FILES["file"]);
        $file_uploader->upload_files();
        //upload_files($_FILES["file"]);
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

}

exit;