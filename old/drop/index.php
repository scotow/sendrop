<?php

    header('Content-type: text/plain');

    if(!empty($_POST["json"])) {
        exit($_POST["json"]);
    } else {
        include_once "../../lib/error.php";
        exit(json_encode(
            custom_error("Dropping error")
        , JSON_PRETTY_PRINT));
    }