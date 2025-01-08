function ddt#ui#do_action(
      \ action_name, params = {}, ui_name=b:->get('ddt_ui_name', '')) abort
  call ddt#ui_action(a:ui_name, a:action_name, a:params)
endfunction
