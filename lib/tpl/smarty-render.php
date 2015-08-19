<?php

${initer | raw}

$data = json_decode($_GET['jsonData'], true);

foreach ($data as $key => $value) {
    $smarty->assign($key, $value);
}

$smarty->display($_GET['tplPath']);