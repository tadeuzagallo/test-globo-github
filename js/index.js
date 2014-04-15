(function (w, d) {
  var content = d.querySelector('#content');

  var tpl = {};
  tpl._load = function (name) {
    var tplID = '#' + name + '-tpl';
    var tpl = d.querySelector(tplID).innerHTML;

    return _.template(tpl);
  }
  tpl.projects = tpl._load('projects');
  tpl.projectDetails = tpl._load('project-details');
  tpl.commitDetails = tpl._load('commit-details');

  var github = {
    apiURL: 'https://api.github.com/'
  };

  github._request = function (url, callback) {
    var request = new XMLHttpRequest();
    var that = this;

    request.open('GET', url);

    request.addEventListener('load', function (event) {
      try {
        if (request.status !== 200) {
          throw new Error('Failed to load user repos');
        }

        callback(JSON.parse(request.responseText), null);
      } catch (exception) {
        console.log(exception);
        callback(null, exception);
      }
    });

    request.addEventListener('error', function(error) {
      cb(null, error);
    });

    request.send();
  }

  github.repos = function (user, cb) {
    var userURL = this.apiURL +  'users/' + user + '/repos';

    this._request(userURL, function (repos, error) {
      if (error) {
        return cb(null, error);
      }

      github._repos = _.reduce(repos, function (stack, repo) {
        repo.commits = [];
        stack[repo.name] = repo;

        return stack;
      }, {});

      cb(repos, null);
    });
  };

  github.repo = function (name) {
    return this._repos && this._repos[name];
  };

  github.loadCommits = function (repo, page, cb) {
    var pageSize = 21;

    if (page && !cb) { cb = page; page = 1; }
      console.log(repo.commits.length);
    if (repo.commits.length >= page * pageSize ) {
      cb(repo.commits.slice((page - 1) * (pageSize - 1), pageSize), null);
      return;
    }

    var commits_url = repo.commits_url.replace(/{[^}]+}/, '') + '?per_page=' + pageSize;

    if (repo.commits.length) {
      commits_url += '&last_sha=' + repo.commits[repo.commits.length - 2].sha;
    }
    this._request(commits_url, function (commits, error) {
      cb(commits, error);
      repo.commits = repo.commits.slice(0, -1).concat(commits);
    });
  };

  github.repos('globocom', function (repos, error) {
    if (error) {
      alert('Houve um erro ao listar os projetos. Por favor recarregue a página');
      console.log(error);
      return;
    }

    repos = repos.sort(function (a, b) {
      return b.stargazers_count - a.stargazers_count;
    });

    d.querySelector('#projects').innerHTML = tpl.projects({ projects: repos });

    loadHash();
  });

  function loadHash() {
    var repoName = w.location.hash.substr(2);

    if (!repoName) {
      return;
    }

    var repo = github.repo(repoName);

    (document.querySelector('li.active') || {}).className = '';
    content.innerHTML = ''; 
    document.querySelector('#' + repo.name).className = 'active';
    content.innerHTML = tpl.projectDetails(repo);

    var more = d.querySelector('#more-commits');
    var page = 1;

    more.addEventListener('click', function (e) {
      e.preventDefault();
      load(++page)
    });

    load(1);

    function load(page) {
      github.loadCommits(repo, page, function (commits, error) {
        more.style.display = commits.length > 20 ? '' : 'none';

        d.querySelector('#commits').innerHTML += _.map(commits.slice(0, 20), function (commit) {
          commit.author = commit.author || {};
          commit.date = new Date(commit.commit.author.date).toLocaleFormat('%d/%m/%Y');
          return tpl.commitDetails(commit);
        }).join('');
      });
    }
  }

  w.addEventListener('hashchange', loadHash);
})(window, document);
