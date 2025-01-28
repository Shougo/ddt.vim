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

  if !has('nvim') && &l:buftype =~# 'terminal'
    " It must be insert mode to redraw in Vim
    silent! normal! A
  endif
endfunction

function ddt#ui#_set_editor(nvim_server) abort
  " Set $EDITOR.
  let editor_command = ''
  if 'g:loaded_guise'->exists()
    " Use guise instead
  elseif 'g:edita_loaded'->exists()
    " Use edita instead
    let editor_command = edita#EDITOR()
  "elseif v:progname ==# 'nvim' && has('nvim-0.7')
  "      \ && nvim_server->expand()->filereadable()
  "  " Use clientserver for neovim
  "  NOTE: --remote-tab-wait-silent is not implemented yet in neovim.
  "  https://github.com/neovim/neovim/pull/18414
  "  let editor_command =
  "        \ printf('%s --server %s --remote-tab-wait-silent',
  "        \   v:progpath, nvim_server->s:expand())
  elseif v:progname ==# 'nvim' && 'nvr'->executable() && v:servername !=# ''
    " Use neovim-remote for neovim
    let editor_command =
          \ printf('nvr --servername=%s --remote-tab-wait-silent',
          \   v:servername)
  elseif v:progpath->executable() && has('clientserver') && v:servername !=# ''
    " Use clientserver feature for Vim
    let editor_command =
          \ printf('%s --servername=%s --remote-tab-wait-silent',
          \   v:progpath, v:servername)
  elseif v:progpath->executable()
    let editor_command = v:progpath
  endif

  if editor_command !=# ''
    let $EDITOR = editor_command
    let $GIT_EDITOR = editor_command
  endif
endfunction
