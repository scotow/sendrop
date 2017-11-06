<?php

class File {

    public $name;
    public $size;
    public $alias;

    public function __construct($data) {
        if(is_string($data)) {
            $this->construct_with_alias($data);
        } else if(is_array($data)) {
            $this->construct_with_data($data);
        } else {
            throw new Error("File creation failed.");
        }
    }

    private function construct_with_alias($alias) {
        $this->alias = $alias;
        $this->fetchDataFromDatabase();
    }

    private function fetchDataFromDatabase() {
        global $conn;

        var_dump($conn);
    }

    private function construct_with_data($data) {

    }

    public function get_data() {
        $short_version = !empty($_POST["short"]) || !empty($_POST["tiny"]);

        if($this->error) {

        }
    }

    public function upload() {
        global $conn;


    }

}