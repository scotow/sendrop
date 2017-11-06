$(function(){
    new Clipboard('.copy');

    if(Clipboard.isSupported()) {
        $('.copy').click(function(){
            var $button = $(this);
            var $input = $button.prev();
            $button.addClass('copied');
            $input.addClass('copied');
            setTimeout(function(){
                $button.removeClass('copied');
                $input.removeClass('copied');
            }, 1500);
            setTimeout(function(){
                window.getSelection().removeAllRanges();
            }, 0);
        });
    } else {
        $('.link').addClass('no-copy');
    }
});