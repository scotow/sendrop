$(function() {
    new Clipboard('.copy');

    if(Clipboard.isSupported()) {
        $('.copy').click(function() {
            var $button = $(this);
            var $input = $button.prev();
            $button.addClass('triggered');
            $input.addClass('copied');
            setTimeout(function() {
                $button.removeClass('triggered');
                $input.removeClass('copied');
            }, 1500);
            setTimeout(function() {
                window.getSelection().removeAllRanges();
            }, 0);
        });
    } else {
        $('.link').addClass('no-copy');
    }

    $('.download').click(function() {
        var $button = $(this);
        $button.addClass('triggered');
        setTimeout(function() {
            $button.removeClass('triggered');
        }, 1500);
    })
});
