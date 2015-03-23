/**
 * Created by rodrigoburg on 23/03/15.
 */

// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.variancia; }
function y(d) { return d.governismo; }
function radius(d) { return d.num_deputados; }
function color(d) { return cores[d.name]; }
function key(d) { return d.name; }

// Chart dimensions.
var margin = {top: 70, right: 19.5, bottom: 19.5, left: 39.5},
    width = 960 - margin.right,
    height = 600 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.linear().domain([0, 18]).range([50, width]),
    yScale = d3.scale.linear().domain([20, 100]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([1, 100]).range([0, 70]);

// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// variável que guarda os meses e perdidos que estão nos dados
var periodo = []
var partidos = []
var partidos_selecionados = []
var cores = {}

// tradução do mês
var traducao_mes = {
    "jan":"01",
    "fev":"02",
    "mar":"03",
    "abr":"04",
    "mai":"05",
    "jun":"06",
    "jul":"07",
    "ago":"08",
    "set":"09",
    "out":"10",
    "nov":"11",
    "dez":"12"
}

var traducao_mes2 = {
    "01":"jan",
    "02":"fev",
    "03":"mar",
    "04":"abr",
    "05":"mai",
    "06":"jun",
    "07":"jul",
    "08":"ago",
    "09":"set",
    "10":"out",
    "11":"nov",
    "12":"dez"
}

var paleta = {
    0:'#A11217',
    1:'#BE003E',
    2:'#BC005C',
    3:'#BA007C',
    4:'#98007F',
    5:'#7B057E',
    6:'#5E196F',
    7:'#45187D',
    8:'#3A3A8B',
    9:'#00408F',
    10:'#00528B',
    11:'#0066A4',
    12:'#007CC0',
    13:'#009BDB',
    14:'#0096B2',
    15:'#009493',
    16:'#008270',
    17:'#009045',
    18:'#00602D',
    19: '#5F8930',
    20:'#7BAC39',
    21:'#A3BD31',
    22:'#CAD226',
    23:'#FEEE00',
    24:'#E9BC00',
    25:'#B6720A',
    26:'#9A740F',
    27: '#634600'
}



// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("income per capita, inflation-adjusted (dollars)");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("life expectancy (years)");

// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text("fev 2015");

// Load the data.
d3.json("data/dilma1.json", function(nations) {
    periodo = acha_periodo(nations)
    partidos = acha_partidos(nations)
    partidos_selecionados = partidos
    //faz um multiplicador que transformará o index de cada partido em um número entre 0 e o total de cores da paleta)
    var multiplicador = Object.keys(paleta).length/partidos.length


    for (p in partidos) {
        var cor = parseInt(p*multiplicador)

        //após calcular o index novo do partido, adiciona isso numa variável global
        cores[partidos[p]] = paleta[cor]
    }


// A bisector since many nation's data is sparsely-defined.
    var bisect = d3.bisector(function(d) { return d[0]; });

// Add a dot per nation. Initialize the data at 0 (primeiro mês), and set the colors.
    var dot = svg.append("g")
        .attr("class", "dots")
        .selectAll(".dot")
        .data(interpolateData(0))
        .enter().append("circle")
        .attr("id", function(d) { return d.name})
        .attr("class", "dot")
        .style("fill", function(d) { return color(d); })
        .style("stroke", function(d) { return color(d); })
        .call(position)
        .sort(order);

// Add a title.
    dot.append("title")
        .text(function(d) { return d.name; });

// Add an overlay for the year label.
    var box = label.node().getBBox();

    var overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);

// Start a transition that interpolates the data based on year.
    svg.transition()
        .duration(6000)
        .tween("year", tweenYear)
        .each("end", enableInteraction);

// Positions the dots based on data.
    function position(dot) {
        dot .attr("cx", function(d) { return xScale(x(d)); })
            .attr("cy", function(d) { return yScale(y(d)); })
            .attr("r", function(d) { return radiusScale(radius(d)); })
	    .attr("stroke-width", "7")
	    .attr("stroke", function(d) { return color(d); })
	    .attr("fill-opacity", function(d) { return (7 - x(d))/7 } )
        .attr("stroke-opacity", function(d) { return (7 - x(d))/7 } );
    }

// Defines a sort order so that the smallest dots are drawn on top.
    function order(a, b) {
        return radius(b) - radius(a);
    }

// After the transition finishes, you can mouseover to change the year.
    function enableInteraction() {
        var yearScale = d3.scale.linear()
            .domain([0, periodo.length])
            .range([box.x + 10, box.x + box.width - 10])
            .clamp(true);

// Cancel the current transition, if any.
        svg.transition().duration(100);

        overlay
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("mousemove", mousemove)
            .on("touchmove", mousemove);

        function mouseover() {
            label.classed("active", true);
        }

        function mouseout() {
            label.classed("active", false);
        }

        function mousemove() {
            svg.transition().duration(2000)
            displayYear(yearScale.invert(d3.mouse(this)[0]));
        }
    }

// Tweens the entire chart by first tweening the year, and then the data.
// For the interpolated data, the dots and label are redrawn.
    function tweenYear() {
        var year = d3.interpolateNumber(0, periodo.length -1);
        return function(t) { displayYear(year(t));};
    }

// Updates the display to show the specified year.
    function displayYear(year) {
        dot.data(interpolateData(year), key).call(position).sort(order);
        label.text(escreve_data(year));
    }

    function escreve_data(year) {
        if (year == periodo.length) {
            year = year -1
        }

        var temp = periodo[Math.floor(year)];
        var ano = temp.split("-")[0]
        var mes = traducao_mes2[temp.split("-")[1]]
        return mes + " " + ano
    }
// Interpolates the dataset for the given (fractional) year.
    function interpolateData(year) {
        year = periodo[Math.floor(year)]
        var a = nations.map(function(d) {
            return {
                name: d.name,
                governismo: interpolateValues(d.governismo, year),
                variancia: interpolateValues(d.variancia, year),
                num_deputados: interpolateValues(d.num_deputados, year)
            };
        });
        return(a)
    }

// Finds (and possibly interpolates) the value for the specified year.
    function interpolateValues(values, year) {
        var i = bisect.left(values, year, 0, values.length - 1),
            a = values[i];
        return a[1];
    }

    function acha_periodo(dados) {
        var saida = []
        dados[0].governismo.forEach(function (d) {
            saida.push(d[0])
        })
        return saida
    }

    function acha_partidos(dados) {
        var saida = []
        dados.forEach(function (d) {
            saida.push(d.name)
        })
        return saida
    }
    adiciona_partidos()
});

//função para o menu de partidos
function toggleSelect(el) {
    var container_selecionadas = $("#partSelecionados"),
        container_n_selecionadas = $("#partNSelecionados"),
        item = $(el).parent();
    $(el).toggleClass("selecionada").toggleClass("nao-selecionada").toggleClass("glyphicon").toggleClass("glyphicon-remove-circle");
    if (item.parent()[0].id == "partNSelecionados") {
        container_selecionadas.append(item);
        partidos_selecionados.push($(el).text());
        coloca_partido($(el).text())
    } else {
        container_n_selecionadas.append(item);
        partidos_selecionados.splice(partidos_selecionados.indexOf($(el).text().trim()),1);
        tira_partido($(el).text())
    }
    $("#partSelecionados li").sort(sort_comp).appendTo("#partSelecionados");
    $("#partNSelecionados li").sort(sort_comp).appendTo("#partNSelecionados");
}

function sort_comp(a,b) {
    return $(b).data('pos') < $(a).data("pos") ? 1 : -1;
}

function adiciona_partidos() {
    var botao = $("#partSelecionados")
    var i = 1
    partidos.forEach(function (d) {
        var item = '<li role="presentation" data-pos="'+i+'"><a role="menuitem" onclick="toggleSelect(this);" class="selecionada glyphicon glyphicon-remove-circle" tabindex="-1" href="#"> '+d+'</a></li>'
        botao.append(item)
        i++
    })
}

function coloca_partido(sigla) {
    $("#"+sigla.trim()).show()
}

function tira_partido(sigla) {
    $("#"+sigla.trim()).hide()
}
