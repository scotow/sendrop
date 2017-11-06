<?php

// Create connection.
$servername = "localhost";
$dbname = "file";
$charset = 'utf8';

$username = "file";
$password = "lkX438A2sGiObnvp";

// Log to database.
$conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=$charset", $username, $password);