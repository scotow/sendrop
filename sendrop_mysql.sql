SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;


CREATE TABLE IF NOT EXISTS `archives` (
`id` bigint(20) unsigned NOT NULL,
  `creation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uploader` varchar(15) NOT NULL,
  `name` varchar(255) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `short_alias` varchar(63) NOT NULL,
  `long_alias` varchar(255) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `archive_files` (
  `archive_id` bigint(20) unsigned NOT NULL,
  `file_id` bigint(20) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `files` (
`id` bigint(20) unsigned NOT NULL,
  `creation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiration` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `uploader` varchar(15) NOT NULL,
  `name` varchar(255) NOT NULL,
  `size` int(10) unsigned NOT NULL,
  `type` varchar(255) NOT NULL,
  `short_alias` varchar(63) NOT NULL,
  `long_alias` varchar(255) NOT NULL,
  `revoke_token` varchar(15) NOT NULL,
  `downloads` int(10) unsigned NOT NULL DEFAULT '0'
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;


ALTER TABLE `archives`
 ADD PRIMARY KEY (`id`);

ALTER TABLE `archive_files`
 ADD PRIMARY KEY (`archive_id`,`file_id`), ADD KEY `fk_files` (`file_id`);

ALTER TABLE `files`
 ADD PRIMARY KEY (`id`);


ALTER TABLE `archives`
MODIFY `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=189;
ALTER TABLE `files`
MODIFY `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2124;

ALTER TABLE `archive_files`
ADD CONSTRAINT `fk_archives` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `fk_files` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
