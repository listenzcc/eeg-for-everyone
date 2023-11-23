$knownCmds = @{
    export_env="conda env export > environment.yml";
    git_merge="git merge --no-ff dev";
    clear_log="rm -Verbose -Recurse ./log/*"
}

function ListCmds {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$false)] [String] $cmdName,
        [Parameter(Mandatory=$false)] [Switch] $execute
    )
    
    begin {
    }
    
    process {
    }
    
    end {

        if ($cmdName) {
            Write-Output $knownCmds[$cmdName]
            if ($execute) {
                Invoke-Expression $knownCmds[$cmdName]
            }
        } else {
            Write-Output $knownCmds
        }

    }
}