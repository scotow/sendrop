$(function(){
    var $body = $('body');
    var $form = $('form');
    var $icon = $('.icon');
    var $fileName = $('#file-name');
    var $input = $('input[type=file]');
    var $pretty = $('#pretty');
    var $submit = $('input[type=submit]');

    var droppedFiles = false;

    // Cookie.
    var prettyCookie = Cookies.get('pretty');
    var pretty = prettyCookie === undefined ? 1 : parseInt(prettyCookie);
    $pretty.prop('checked', pretty).change(function(){
        pretty = this.checked ? 1 : 0;
        Cookies.set('pretty', this.checked ? 1 : 0, {expires: 365});
    });

    // Classic form upload.
    $input.on('change', function(){
        var fileName;
        switch(this.files.length) {
            case 0:
                fileName = '';
                break;
            case 1:
                fileName = this.files[0].name;
                break;
            default:
                fileName = this.files.length + ' files selected';
        }

        droppedFiles = !!fileName;
        if(fileName) {
            $icon.removeClass('floating');
            $fileName.text(fileName);
            $submit.removeClass('hidden');
        } else {
            $icon.addClass('floating');
            $fileName.text('');
            $submit.addClass('hidden');
        }
    });

    // Drag & Drop.
    $body.on('drag dragstart dragend dragover dragenter dragleave drop', function(event) {
        event.preventDefault();
        event.stopPropagation();
    }).on('dragover dragenter', function() {
        if(!droppedFiles) $body.addClass('dragging');
    }).on('dragleave dragend drop', function() {
        if(!droppedFiles) $body.removeClass('dragging');
    }).on('drop', function(event) {
        if(droppedFiles) return;

        droppedFiles = event.originalEvent.dataTransfer.files;

        //var data = new FormData($form.get(0));
        var data = new FormData();
        for(var i = 0; i < droppedFiles.length; i++){
            data.append('files[]', droppedFiles[i]);
        }

        $icon.addClass('floating uploading');
        $fileName.text('');
        $submit.addClass('hidden');

        $input.click(function(){
            return false;
        });

        $.ajax({
            url: $form.attr('action'),
            type: $form.attr('method'),
            data: data,
            dataType: 'text',
            cache: false,
            contentType: false,
            processData: false,
            success: function(data) {
                droppedFiles = false;
                $input.off('click');
                $icon.removeClass('uploading');
                var $redirect = $('<form>', {
                    method: 'POST',
                    action: '/'
                });
                $('<input>', {
                    type: 'hidden',
                    name: 'drop',
                    value: data
                }).appendTo($redirect);
                $('<input>', {
                    type: 'hidden',
                    name: 'pretty',
                    value: pretty
                }).appendTo($redirect);
                $redirect.appendTo($body).submit();
            }, error: function() {
                droppedFiles = false;
                $input.off('click');
                $icon.removeClass('uploading').addClass('error');
                setTimeout(function(){
                    $icon.removeClass('error');
                }, 2000);
            }
        });
    });
});