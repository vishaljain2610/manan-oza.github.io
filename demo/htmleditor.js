/*jslint browser: true*/
/*global  jQuery, document */
jQuery(function ($) {
    "use strict";
    $(document).ready(function () {
       // var p = $("#preview").html;
        $(".CodeMirror-code").on('keyup', function () {
            $("#htmlpr").html($(".CodeMirror-code").text());
        });
//        $("#css").live('keyup', function () {
//            p.find("#csspr").html($(this).val());
//        });
//        $("#js").live('change', function () {
//            p.find("#jspr").remove();
//            var app = document.createElement('SCRIPT');
//            app.setAttribute("id", "jspr");
//            document.getElementById('jspr').innerHTML = $("#js").val();
//            p.append(app);
//            //p.find("#jspr").remove();
//            //p.append('<script id="jspr">' + "$(document).ready(function(){" + $("#js").val() + "});" + '</script>');
//        });
//        $("#upjs").live('click', function () {
//            p.find("#jspr").remove();
//            p.append('<script id="jspr">' + "$(document).ready(function(){" + $("#js").val() + "});" + '</script>');
//        });
    });
});