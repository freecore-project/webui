# $FreeBSD$

PORTNAME=	freenas-webui
PORTVERSION=	${PRODUCT_VERSION:C/\-.*//:C/\_.*//}
PORTREVISION=	${REVISION}

CATEGORIES=		freenas
VALID_CATEGORIES+=	freenas

MAINTAINER=	dev@ixsystems.com
COMMENT=	Angular Web User Interface for FreeNAS

EXTRACT_ONLY=

# python3 is required by node-gyp: the toolchain pulls @parcel/watcher (transitively,
# via nx) whose node-gyp-build has no FreeBSD prebuilt, so it compiles from source
# during `yarn install` below.  Without it the fetch target dies with
# "Could not find any Python installation to use".  It only shows up in the build
# jail — a developer machine always has python3 on PATH.  See the internal development record.
FETCH_DEPENDS=	yarn:www/yarn \
		git>0:devel/git \
    gmake:devel/gmake \
		python3:lang/python3
BUILD_DEPENDS=	rsync>0:net/rsync \
		yarn:www/yarn \
    gmake:devel/gmake

NO_BUILD=	yes
WRKSRC=		/usr/webui

MTIMEREV!=	stat -f %m /usr/webui

checksum:
	${ECHO_CMD} ${.TARGET} not needed because building direct

fetch:
	${MKDIR} ${WRKDIR}
	# the internal development record: do NOT overwrite helptext/product.ts — the repo carries the
	# fork identity (FreeCORE, the internal development record) and PRODUCT stays 'TrueNAS' for ISO/release
	# and train naming (protected heritage touch, the internal development record).
	# the internal development record: product.js retired with its only consumer (index.html splash).
	# the internal development record: no NODE_OPTIONS=--openssl-legacy-provider.  It existed only so
	# webpack's MD4 hashing survived OpenSSL 3, and Angular 15 no longer needs it --
	# building with the flag and without it produced byte-identical output (7,359,641
	# bytes over the same 613 files).  #41 predicted webpack 5 would end the need at
	# Angular 12 and #42 disproved that by testing; this is the re-test #42 asked for.
	# Do not re-add it speculatively: if a future hop needs it, re-test and say so here.
	(cd ${WRKSRC} && ${LOCALBASE}/bin/yarn install && ${LOCALBASE}/bin/yarn run build:prod:aot)

extract:
	:

do-install:
	mkdir -p ${STAGEDIR}${PREFIX}/www/webui/
	rsync -avl --exclude '.git' --exclude 'nas_ports' --exclude 'etc' --exclude 'sbin' ${WRKSRC}/dist/ ${STAGEDIR}${PREFIX}/www/webui/
	${ECHO} "${MTIMEREV}" > ${STAGEDIR}/${PREFIX}/www/webui/assets/buildtime
	(cd ${STAGEDIR}${PREFIX}/www/webui; ${FIND} . -type f \
		| ${SED} -e 's,^\./,,g' \
		| ${AWK} '{print length, $$0}' | ${SORT} -rn \
		| cut -d " " -f 2- \
		| ${AWK} '{print "www/webui/"$$0 }' >> ${TMPPLIST})

.include <bsd.port.mk>
