function ddt#ui#do_action(
      \ action_name, params = {}, ui_name=b:->get('ddt_ui_name', '')) abort
  call ddt#ui_action(a:ui_name, a:action_name, a:params)
endfunction

function ddt#ui#kill_editor() abort
  if !'g:ddt_ui_last_winid'->exists()
    return
  endif

  bdelete

  call win_gotoid(g:ddt_ui_last_winid)

  redraw!
endfunction
