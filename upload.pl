#!/usr/bin/env perl

use strict;
use warnings;

use Getopt::Std;
use File::Temp;

my @files;

my %opts = ();
getopts('iqj', \%opts);

if ($opts{'i'}) {
    my $output = `zenity --file-selection --multiple --separator=' ' 2>/dev/null`;
    @files = split ' ', $output;
} else {
    @files = ();
    if (@ARGV) {
        foreach (@ARGV) {
            if ($_ eq '-') {
                read_stdin();
            } else {
                if (-f $_) {
                    push @files, $_;
                } else {
                    print "Cannot upload '$_'. Skipping.", "\n";
                }
            }
        }
    } else {
        read_stdin();
    }
}

upload();

sub read_stdin {
    my $tmp = File::Temp->new();

    my $line;
    foreach $line( <STDIN> ) {
        # chomp $line;
        print $tmp $line;
    }

    push @files, $tmp;
}

sub upload {
    unless (@files) {
        print 'No file to upload. Exiting.', "\n";
        exit 1;
    }

    my @params = map "files=\@$_", @files;

    if ($opts{'q'}) {
        push @params, "qr=1"
    } else {
        unless ($opts{'j'}) {
            push @params, "short=1"
        }
    }

    my $form = join(' ', map "-F $_", @params);
    print `curl -sL $form https://file.scotow.com`, "\n";
}