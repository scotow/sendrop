<?php

//ini_set('display_errors', 1);
//ini_set('display_startup_errors', 1);
//error_reporting(E_ALL);

include_once __DIR__ . "/../config/database.php";

include_once "error.php";
include_once "archive.php";


// Short alias.
function get_file_short_alias($alias) {
    global $conn;

    $stmt = $conn->prepare("SELECT COUNT(id) AS count FROM files WHERE BINARY short_alias = :short_alias");
    $stmt->bindParam(":short_alias", $alias);

    $stmt->execute();

    $count = intval($stmt->fetch(PDO::FETCH_ASSOC)["count"]);

    if($count !== 1) {
        return false;
        //exit_with_error(custom_error("File not found"));
    }

    $stmt = $conn->prepare("SELECT id, name FROM files WHERE BINARY short_alias = :short_alias");
    $stmt->bindParam(":short_alias", $alias);

    $stmt->execute();

    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    $file["path"] = "../uploads/" . $file["id"];

    if(!file_exists($file["path"])){
        return false;
        //exit_with_error(custom_error("The file expired"));
    }

    return $file;
}

function download_short_alias($alias) {
    $file = get_file_short_alias($alias);
    if($file) {
        download_file($file);
    } else {
        exit_with_error(custom_error("File not found"));
    }
}


// Long alias.
function get_file_long_alias($alias) {
    global $conn;

    $stmt = $conn->prepare("SELECT COUNT(id) AS count FROM files WHERE BINARY long_alias = :long_alias");
    $stmt->bindParam(":long_alias", $alias);

    $stmt->execute();

    $count = intval($stmt->fetch(PDO::FETCH_ASSOC)["count"]);

    if($count !== 1) {
        return false;
        //exit_with_error(custom_error("File not found"));
    }

    $stmt = $conn->prepare("SELECT id, name FROM files WHERE BINARY long_alias = :long_alias");
    $stmt->bindParam(":long_alias", $alias);

    $stmt->execute();

    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    $file["path"] = "../uploads/" . $file["id"];

    if(!file_exists($file["path"])){
        return false;
        //exit_with_error(custom_error("The file expired"));
    }

    return $file;
}

function download_long_alias($alias) {
    $file = get_file_long_alias($alias);
    if($file) {
        download_file($file);
    } else {
        exit_with_error(custom_error("File not found"));
    }
}


// Zip.
function download_zip($uri) {
    $aliases = explode("+", $uri);
    $files = array();

    foreach($aliases as $alias) {
        $file = false;
        if(preg_match("/^[a-zA-Z0-9]{6}$/", $alias)) {
            $file = get_file_short_alias($alias);
        } else if(preg_match("/^[a-z]+(-[a-z]+){2}$/", $alias)) {
            $file = get_file_long_alias($alias);
        }
        if($file) {
            $files[] = $file;
        }
    }

    $files_count = count($files);
    if($files_count === 0) {
        exit_with_error(custom_error("Files not found"));
    } else if($files_count === 1 && empty($_POST["zip"])) {
        download_file($files[0]);
    } else {
        $zip = zip_files($files);
        download_file($zip);
        delete_zip($zip);
    }
}

function download_file($file) {
    if((!empty($_POST["image"]) || !empty($_POST["i"])) && $image_type = exif_imagetype($file["path"])) {
        header('Content-Type: ' . image_type_to_mime_type($image_type));
    } else {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $file["name"] .'"');
    }

    common_header($file);
    readfile($file["path"]);
}

function common_header($file) {
    header('Content-Description: File Transfer');
    header('Expires: 0');
    header('Cache-Control: must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . filesize($file["path"]));
}

function exit_with_error($error) {
    header('Content-type: text/plain');

    $short_version = !empty($_POST["short"]) || !empty($_POST["tiny"]);

    if($short_version) {
        exit(implode(" - ", $error));
    } else {
        exit(json_encode($error, JSON_PRETTY_PRINT));
    }
}