<?php

include_once __DIR__ . "/../config/database.php";

include_once "alias.php";
include_once "converter.php";

function create_archive(&$files) {
    global $conn;

    $archive_size = 0;
    foreach($files as $file) {
        $archive_size += $file["info"]["size"]["bytes"];
    }

    $short_alias = short_alias(6);
    $long_alias = long_alias(3);

    // Prepare request.
    $stmt = $conn->prepare("INSERT INTO archives (uploader, size, short_alias, long_alias) VALUES (:uploader, :size, :short_alias, :long_alias)");
    $stmt->bindParam(":uploader", $_SERVER["REMOTE_ADDR"]);
    $stmt->bindParam(":size", $archive_size, PDO::PARAM_INT);
    $stmt->bindParam(":short_alias", $short_alias);
    $stmt->bindParam(":long_alias", $long_alias);

    $stmt->execute();

    $archive_id = $conn->lastInsertId();

    // Add each file.
    $stmt = $conn->prepare("INSERT INTO archive_files (archive_id, file_id) VALUES (:archive_id, :file_id)");
    $stmt->bindParam(":archive_id", $archive_id, PDO::PARAM_INT);
    $stmt->bindParam(":file_id", $file_id, PDO::PARAM_INT);

    foreach($files as $file) {
        $file_id = $file["id"];
        $stmt->execute();
    }

    foreach($files as &$file) {
        unset($file["id"]);
    }

    return array(
        "info" => array(
            "size" => array(
                "bytes" => $archive_size,
                "readable" => human_filesize($archive_size)
            )
        ),
        "alias" => array(
            "short" => $short_alias,
            "long" => $long_alias
        ),
        "link" => array(
            "short" => "https://file.scotow.com/a/" . $short_alias,
            "long" => "https://file.scotow.com/a/" . $long_alias
        )
    );

}

function get_archive_short_alias($alias) {
    global $conn;

    // Check if the archive exists.
    $stmt = $conn->prepare("SELECT COUNT(id) AS count FROM archives WHERE BINARY short_alias = :short_alias");
    $stmt->bindParam(":short_alias", $alias);

    $stmt->execute();

    $count = intval($stmt->fetch(PDO::FETCH_ASSOC)["count"]);

    if($count !== 1) {
        return false;
        //exit_with_error(custom_error("Archive not found"));
    }

    // Fetch the archive id.
    $stmt = $conn->prepare("SELECT id FROM archives WHERE BINARY short_alias = :short_alias");
    $stmt->bindParam(":short_alias", $alias);

    $stmt->execute();

    $archive_id = $stmt->fetch(PDO::FETCH_ASSOC)["id"];

    $stmt = $conn->prepare("SELECT id, name FROM archive_files INNER JOIN files ON file_id = id WHERE archive_id = :archive_id");
    $stmt->bindParam(":archive_id", $archive_id, PDO::PARAM_INT);

    $stmt->execute();

    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $available_files = array();

    foreach($files as $file) {
        $file["path"] = "/var/www/file.scotow.com/uploads/" . $file["id"];
        if(file_exists($file["path"])){
           $available_files[] = $file;
        }
    }

    if(count($available_files) === 0) {
        return false;
    }

    return zip_files($available_files);
}

function get_archive_long_alias($alias) {
    global $conn;

    // Check if the archive exists.
    $stmt = $conn->prepare("SELECT COUNT(id) AS count FROM archives WHERE BINARY long_alias = :long_alias");
    $stmt->bindParam(":long_alias", $alias);

    $stmt->execute();

    $count = intval($stmt->fetch(PDO::FETCH_ASSOC)["count"]);

    if($count !== 1) {
        return false;
        //exit_with_error(custom_error("Archive not found"));
    }

    // Fetch the archive id.
    $stmt = $conn->prepare("SELECT id FROM archives WHERE BINARY long_alias = :long_alias");
    $stmt->bindParam(":long_alias", $alias);

    $stmt->execute();

    $archive_id = $stmt->fetch(PDO::FETCH_ASSOC)["id"];

    $stmt = $conn->prepare("SELECT id, name FROM archive_files INNER JOIN files ON file_id = id WHERE archive_id = :archive_id");
    $stmt->bindParam(":archive_id", $archive_id, PDO::PARAM_INT);

    $stmt->execute();

    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $available_files = array();

    foreach($files as $file) {
        $file["path"] = "/var/www/file.scotow.com/uploads/" . $file["id"];
        if(file_exists($file["path"])){
            $available_files[] = $file;
        }
    }

    if(count($available_files) === 0) {
        return false;
    }

    return zip_files($available_files);
}

function zip_files($files) {
    $zip = new ZipArchive();
    $zip_path = "/var/www/file.scotow.com/uploads/zip" . microtime(true);
    //$files_name = array();

    if ($zip->open($zip_path, ZipArchive::CREATE) !== true) {
        return custom_error("Cannot create archive");
    }

    foreach($files as $file) {
        $zip->addFile($file["path"], $file["name"]);
        //$files_name[] = $file["name"];
    }
    $zip->close();

    return array(
        "name" => "files.zip",
        //"name" => implode("+", array_slice($files_name, 0, 3)) . ".zip",
        "path" => $zip_path
    );
}

function delete_zip($zip) {
    if(file_exists($zip["path"])) {
        unlink($zip["path"]);
        return true;
    } else {
        return false;
    }
}

