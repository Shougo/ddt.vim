function ddt#ui#terminal#kill_editor() abort
  if !'g:ddt_ui_terminal_winid'->exists()
    return
  endif

  bdelete

  call win_gotoid(g:ddt_ui_terminal_winid)
endfunction

function ddt#ui#terminal#_set_editor(nvim_server) abort
  " Set $EDITOR.
  " NOTE: --remote-tab-wait-silent is not implemented yet in neovim.
  " https://github.com/neovim/neovim/pull/18414
  let editor_command = ''
  if 'g:loaded_guise'->exists()
    " Use guise instead
  elseif 'g:edita_loaded'->exists()
    " Use edita instead
    let editor_command = edita#EDITOR()
  "elseif v:progname ==# 'nvim' && has('nvim-0.7')
  "      \ && nvim_server->expand()->filereadable()
  "  " Use clientserver for neovim
  "  let editor_command =
  "        \ printf('%s --server %s --remote-tab-wait-silent',
  "        \   v:progpath, nvim_server->s:expand())
  elseif v:progname ==# 'nvim' && 'nvr'->executable()
    " Use neovim-remote for neovim
    let editor_command = 'nvr --remote-tab-wait-silent'
  elseif v:progpath->executable() && has('clientserver')
    " Use clientserver for Vim8
    let editor_command =
          \ printf('%s %s --remote-tab-wait-silent',
          \   v:progpath,
          \   (v:servername ==# '' ? '' : ' --servername='.v:servername))
  elseif v:progpath->executable()
    let editor_command = v:progpath
  endif

  if editor_command !=# ''
    let $EDITOR = editor_command
    let $GIT_EDITOR = editor_command
  endif
endfunction
