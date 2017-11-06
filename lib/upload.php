<?php

include_once "../config/database.php";

include_once "alias.php";
include_once "archive.php";
include_once "converter.php";
include_once "error.php";

function upload_files($files) {
    $files = rearrange_files($files);
    $files_count = count($files);

    if($files_count > 32) {
        exit_with_data(array(custom_error("You cannot upload so many files at once")));
    } else {
        $uploaded_files = array();
        $archive_files = array();
        foreach($files as $file) {
            $uploaded_file = upload_file($file);
            if($uploaded_file["status"] === "success") {
                $archive_files[] = $uploaded_file;
                unset($uploaded_file["id"]);
            }
            $uploaded_files[] = $uploaded_file;
        }
        if(count($archive_files) > 1) {
            $archive = create_archive($archive_files);
            exit_with_data(array(
                "archive" => $archive,
                "files" => $uploaded_files
            ));
        } else {
            exit_with_data($uploaded_files);
        }
    }
}

function upload_file($file) {

    if($file["error"]) {
        return code_to_message($file["error"]);
    }

    if($file["size"] === 0) {
        return custom_error("File is empty");
    }

    if($file["size"] > 2.56e+8) {
        return custom_error("File too large");
    }

    if(strlen($file["name"]) > 255) {
        return custom_error("File's name is too long");
    }

    if(disk_free_space("/") < 1e+9) {
        return custom_error("Server disks are getting full");
    }

    global $conn;

    // Checking total size and files count uploaded today (using user IP).
    $stmt = $conn->prepare("SELECT SUM(size) AS total_size, COUNT(id) AS files_count FROM files WHERE DATE(creation) = CURDATE() AND uploader = :uploader");
    $stmt->bindParam(":uploader", $_SERVER["REMOTE_ADDR"]);

    $stmt->execute();

    $info = $stmt->fetch(PDO::FETCH_ASSOC);
    $total_size = intval($info["total_size"]);
    $files_count = intval($info["files_count"]);

    if($total_size + $file["size"] > 1e+9) {
        return array(
            "status" => "error",
            "error" => "Maximum upload capacity reached",
            "description" => "If you want to request more space, feel free to contact me",
            "email" => "contact@scotow.com"
        );
    }

    if($files_count >= 255) {
        return array(
            "status" => "error",
            "error" => "Maximum uploaded files limit reached",
            "description" => "If you want to request more space, feel free to contact me",
            "email" => "contact@scotow.com"
        );
    }

    // Insertion in database.
    $short_alias = short_alias(6);
    $long_alias = long_alias(3);

    $stmt = $conn->prepare("INSERT INTO files (uploader, name, size, short_alias, long_alias) VALUES (:uploader, :name, :size, :short_alias, :long_alias)");
    $stmt->bindParam(":uploader", $_SERVER["REMOTE_ADDR"]);
    $stmt->bindParam(":name", $file["name"]);
    $stmt->bindParam(":size", $file["size"], PDO::PARAM_INT);
    $stmt->bindParam(":short_alias", $short_alias);
    $stmt->bindParam(":long_alias", $long_alias);

    $stmt->execute();

    $file["id"] = $conn->lastInsertId();

    if(!move_uploaded_file($file["tmp_name"], "../uploads/" . $file["id"])) {
        return custom_error("Error while moving file");
    }

    if($file["size"] < 5e+7) {
        $deletion = mktime(date("H") + 25, 0, 0);
    } else {
        $deletion = mktime(date("H") + 5, 0, 0);
    }

    return array(
        "status" => "success",
        "id" => $file["id"],
        "expire" => array(
            "timestamp" => $deletion,
            "date" => date(DATE_COOKIE, $deletion),
            "remaining" => $deletion - time()
        ),
        "info" => array(
            "name" => $file["name"],
            "size" => array(
                "bytes" => $file["size"],
                "readable" => human_filesize($file["size"])
            )
        ),
        "alias" => array(
            "short" => $short_alias,
            "long" => $long_alias
        ),
        "link" => array(
            "short" => "https://file.scotow.com/" . $short_alias,
            "long" => "https://file.scotow.com/" . $long_alias
        )
    );
}

function rearrange_files($file_post) {
    // Uploading with 'file' rather than 'files'.
    if(gettype($file_post["name"]) === "string") {
        return array($file_post);
    }

    $files = array();
    $file_count = count($file_post["name"]);
    $file_keys = array_keys($file_post);

    for ($i = 0; $i < $file_count; $i++) {
        foreach ($file_keys as $key) {
            $files[$i][$key] = $file_post[$key][$i];
        }
    }

    return $files;
}

function exit_with_data($data) {
    if(!empty($_POST["pretty"])) {
        include "../templates/link.php";
    } else {
        exit_with_text($data);
    }
}

function exit_with_text($data) {
    header('Content-type: text/plain');

    $short_version = !empty($_POST["short"]) || !empty($_POST["tiny"]);

    $files = isset($data["files"]) ? $data["files"] : $data;

    if(count($files) === 1) {
        $file = $files[0];
        if($short_version) {
            if($file["status"] === "success") {
                exit($file["link"]["short"]);
            } else {
                exit(implode(" - ", $file));
            }
        } else {
            exit_with_json($file);
        }
    } else {
        if($short_version) {
            $lines = array();
            foreach ($files as $file) {
                if($file["status"] === "success") {
                    $lines[] = $file["link"]["short"];
                } else {
                    $lines[] = implode(" - ", $file);
                }
            }
            exit(implode("\n", $lines));
        } else {
            exit_with_json($data);
        }
    }
}

function exit_with_json($data) {
    exit(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}