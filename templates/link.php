<?php

// Exseparatores from archive/files package.
if(isset($data["archive"])) {
    $archive = $data["archive"];
    $files = $data["files"];
} else {
    $files = $data;
}

// If only one file, then add it on one element list.
if(isset($files["status"])) {
    $files = array($files);
}

// To add 's' to description string.
$is_multiple_files = count($files) > 1;

function link_html($file) {
    echo implode(array(
        '<div class="link hint--top hint--bounce" aria-label="' . $file["info"]["name"] . ' - (' . $file["info"]["size"]["readable"] . ')&#10;&#10;' . $file["alias"]["long"] . '&#10;&#10;' . $file["expire"]["date"] . '">',
            '<input id="f-' . $file["alias"]["short"] . '" type="text" size="30" readonly value="' . $file["link"]["short"] . '">',
            '<button class="copy" data-clipboard-target="#f-' . $file["alias"]["short"] . '">Copy</button>',
        '</div>'
    ));
}

function error_html($file) {
    echo implode(array(
        '<div class="link error">',
            implode(" - ", $file),
        '</div>'
    ));
}

function archive_html($archive) {
    echo implode(array(
        '<div class="separator">Archive</div>',
        '<div class="link hint--top hint--bounce" aria-label="' . $archive["info"]["size"]["readable"] . '&#10;&#10;' . $archive["alias"]["long"] . '">',
            '<input id="a-' . $archive["alias"]["short"] . '" type="text" size="30" readonly value="' . $archive["link"]["short"] . '">',
            '<button class="copy" data-clipboard-target="#a-' . $archive["alias"]["short"] . '">Copy</button>',
        '</div>'
    ));
}

?>

<!DOCTYPE html>
<html>
<head>
    <title>File<?=$is_multiple_files ? 's' : ''?> Link<?=$is_multiple_files ? 's' : ''?> - Scotow</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/hint.css/2.4.1/hint.min.css">
    <link rel="stylesheet" href="css/link/style.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
    <script src="js/link/clipboard.min.js"></script>
    <script src="js/link/app.min.js"></script>
</head>
<body>
    <div class="links">
        <div class="ready-label">Your file<?=$is_multiple_files ? "s are " : " is "?>ready</div>
        <?php
            foreach($files as $file) {
                if($file["status"] === "success") {
                    link_html($file);
                } else {
                    error_html($file);
                }
            }
            if(isset($archive)){
                archive_html($archive);
            }
        ?>
    </div>
</body>
</html>