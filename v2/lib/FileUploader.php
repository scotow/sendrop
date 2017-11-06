<?php

class FileUploader {

    private $files;

    function __construct($files) {
        $this->files = $files;
        $this->rearrange_files();
    }

    function upload_files() {
        if(count($this->files) > 32) {
            echo "Too many files.";
            exit;
        }

        $this->files = array_map(function($data) {
            $file = new File($data);
            $file->upload();
            return $file;
        }, $this->files);


    }

    function rearrange_files() {
        // Uploading with 'file' rather than 'files'.
        if(is_string($this->files["name"])) {
            $this->files = array($this->files);
            return;
        }

        $rearranged_files = array();
        $file_count = count($this->files["name"]);
        $file_keys = array_keys($this->files);

        for ($i = 0; $i < $file_count; $i++) {
            foreach ($file_keys as $key) {
                $rearranged_files[$i][$key] = $this->files[$key][$i];
            }
        }

        $this->files = $rearranged_files;
    }

}